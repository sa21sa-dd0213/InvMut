import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m5be1318d test", function () {
  it("should revert when withdrawing with amount > 0 due to mutant changing > to <", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Mint tokens to addr1 and approve the staking contract
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);
    
    // Stake tokens first
    await instance.connect(addr1).stake(stakeAmount);
    
    // Try to withdraw with a positive amount - should revert in mutant because amount < 0 is impossible
    // In the original contract, amount > 0 allows withdrawal
    // In the mutant, amount < 0 is required which can never be true for uint256
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("1"), false)
    ).to.be.reverted;
  });
});

// Helper mock ERC20 contract for testing
contract ERC20Mock {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}