import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - me44cbe38", function () {
  it("should revert when withdrawing more than staked balance (original behavior) but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 for testing
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(addr1.address, stakeAmount);
    
    // addr1 stakes 100 tokens
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(addr1).stake(stakeAmount);
    
    // Try to withdraw more than staked (e.g., 150 tokens)
    const withdrawAmount = ethers.parseEther("150");
    
    // This should revert with "Not enough staked tokens" in the original contract
    // In the mutant (with <= instead of >=), it would allow the withdrawal
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount, false)
    ).to.be.revertedWith("Not enough staked tokens");
  });
});

// Helper contract for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        balanceOf[msg.sender] = initialSupply;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function totalSupply() public view returns (uint256) {
        return balanceOf[address(this)];
    }
}