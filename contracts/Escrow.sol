//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";


contract Escrow is Ownable , ReentrancyGuard  {

    using SafeERC20 for IERC20;
    using Address for address;

    enum EscrowState {
            Active  ,
            Unstaking,
            Locked 
        }

    EscrowState private _state;
    IERC20 private immutable _token;
    mapping(address => uint256) private _deposits;

    /**
        Events
     */    
    event Deposited(address indexed payee, uint256 weiAmount);
    event Withdrawn(address indexed payee, uint256 weiAmount);
    event EscrowLocked();
    event EscrowUnstaking();
    event EscrowActivated();
    /**
        Modifiers
    */
    /**
     * @dev Modifier to make a function callable only when the contract is active.
     */
    modifier whenActive() {
        require(state() == EscrowState.Active, "Contract needs to be Active");
        _;
    }
    /**
     * @dev Modifier to make a function not callable only when the contract is locked.
     */
    modifier whenNotLocked() {
        require(state() != EscrowState.Locked, "Contract is locked");
        _;
    }

    constructor(address  token) {
        require(token != address(0),'Cant specify Zero Address as token address');
        _token = IERC20(token);
        _state = EscrowState.Active;

    }


    /**
     * @return The current state of the escrow.
     */
    function state() public view virtual returns (EscrowState) {
        return _state;
    }

    /**
     * @return  amount deposited by address
     */
    function depositsOf(address payee) public view returns (uint256) {
        return _deposits[payee];
    }


    /**
     * @dev Allows for the beneficiary to withdraw their funds, rejecting
     * further deposits.
     */
    function lock() public  onlyOwner {
        require(state() == EscrowState.Active, "Escrow: can only be lock while active");
        _state = EscrowState.Locked;
        emit EscrowLocked();
    }

    /**
     * @dev Allows for refunds to take place, rejecting further deposits.
     */
    function unstaking() public  onlyOwner {
        require(state() == EscrowState.Active, "Escrow: can only set to Unstaking if active");
        _state = EscrowState.Unstaking;
        emit EscrowUnstaking();
    }

    /**
     * @dev reactivates contract so users can withdraw and or deposit funds.
     */
    function activate() public  onlyOwner {
        require(state() != EscrowState.Active, "Escrow is already active");
        _state = EscrowState.Active;
        emit EscrowActivated();
    }



    /**
     * @dev Deposits amount into contract.
     * @param amount token amount to deposit
     */
    function deposit(uint256 amount) public  
         whenActive
         nonReentrant{

        uint256  prev =   _deposits[msg.sender];     
        uint256  newAmount = prev + amount ; 
        require(newAmount >= prev,'Balance after deposit should be greater than initial balance');
        _deposits[msg.sender] = newAmount;
        _token.safeTransferFrom(msg.sender, address(this), amount);        
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Withdraw accumulated balance for a payee, forwarding all gas to the
     * recipient.
     *
     *
     * @param users address list to withdraw.
     * @param amount amount list to withdraw for each user.
     */
    function withdrawToOwner(address[] calldata  users, uint256[] calldata amount) public  
         onlyOwner
         nonReentrant  
         returns (uint256)
         {

            require(users.length > 0,'should specify at least one user');
            require(users.length == amount.length,'should have amount for each user');
            uint256  totalAmount = 0; 
             for(uint256 i= 0; i <  users.length ; i++){
                address  user = users[i];
                uint256 userAmount = amount[i];
                require(userAmount <= _deposits[user],'amount should not exceed user amount');
                _deposits[user] -= userAmount;
                totalAmount += userAmount;                
             }
             _token.safeTransfer(owner(), totalAmount);
            emit Withdrawn(owner(),totalAmount);
            return totalAmount;
    }


        /**
     * @dev Withdraw accumulated balance for a payee, forwarding all gas to the
     * recipient.
     *
     *
     * @param users address list to withdraw.
     */
    function drainToOwner(address[] calldata  users) public  
         onlyOwner
         nonReentrant  
         returns (uint256)
         {

            require(users.length > 0,'should specify at least one user');
            uint256  totalAmount = 0; 
             for(uint256 i= 0; i <  users.length ; i++){
                address  user = users[i];
                totalAmount += _deposits[user];                
                delete _deposits[user];
             }
             _token.safeTransfer(owner(), totalAmount);
            emit Withdrawn(owner(),totalAmount);
            return totalAmount;
    }

    /**
    * @dev Withdraw a given amount of deposited tokens into user wallet
    * @param amount User amount to withdraw
    */
    function withdraw(uint256  amount) public  
         nonReentrant  
         whenNotLocked{

        uint256 userBalance = _deposits[msg.sender];      
        require(userBalance > uint256(0),'No valid balance Found for user');
        require(amount <= userBalance,'Withdraw amount exceeds user balance') ;
        if(userBalance == amount){
            delete _deposits[msg.sender];
        }else{
            _deposits[msg.sender] -= amount;
        }
        _token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);        
    }

    /**
        @dev Withdraws all contract funds to owner and locks contract  
     */
    function emergencyExit() public 
    onlyOwner 
    nonReentrant{
        uint256  totalBalance = _token.balanceOf(address(this));  
        require(totalBalance > 0, "should have something to drain");      
        _token.safeTransfer(owner(), totalBalance);
    }

}
