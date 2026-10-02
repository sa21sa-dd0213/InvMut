import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection test", function () {
  it("should revert when external transferFrom call fails (mutant removed revert)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("TestERC20");
    const token = await ERC20Factory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    // Deploy the airDrop contract (no constructor args needed based on the provided code)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();
    
    // Setup: mint tokens to addr1, then have addr1 approve the airDrop contract to spend tokens
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(instanceAddress, ethers.parseEther("100"));
    
    // Create recipients array
    const recipients = [addr2.address];
    
    // Attempt to call transfer with from=addr1, but with a value larger than their balance (should fail)
    // This will cause the underlying transferFrom to revert, which the original contract should propagate
    await expect(
      instance.connect(owner).transfer(
        addr1.address,
        tokenAddress,
        recipients,
        ethers.parseEther("1000"), // value larger than balance
        18 // decimals
      )
    ).to.be.reverted;
  });
});

// Simple ERC20 token for testing
contract TestERC20 {
    string public name = "Test Token";
    string public symbol = "TST";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
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