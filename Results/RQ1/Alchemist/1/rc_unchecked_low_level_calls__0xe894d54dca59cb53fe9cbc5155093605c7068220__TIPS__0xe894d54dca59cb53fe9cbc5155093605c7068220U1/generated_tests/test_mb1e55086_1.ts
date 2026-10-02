import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test - exponentiation vs multiplication", function () {
  it("should kill mutant mb1e55086 by verifying correct decimal scaling", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing the transferFrom call
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: mint tokens to 'from' and approve airDrop contract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);
    
    // Test parameters: v = 1, decimals = 3
    // Original: _value = 1 * 10**3 = 1000
    // Mutant:   _value = 1 * 10 * 3 = 30
    const v = 1;
    const decimals = 3;
    const recipients = [to.address];
    
    // Get balances before
    const balanceFromBefore = await token.balanceOf(from.address);
    const balanceToBefore = await token.balanceOf(to.address);
    
    // Execute the transfer
    const tx = await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      v,
      decimals
    );
    await tx.wait();
    
    // Check balances after
    const balanceFromAfter = await token.balanceOf(from.address);
    const balanceToAfter = await token.balanceOf(to.address);
    
    // Original would transfer 1000 tokens, mutant would transfer 30 tokens
    // This assertion passes on original but fails on mutant
    expect(balanceToAfter - balanceToBefore).to.equal(1000);
    expect(balanceFromBefore - balanceFromAfter).to.equal(1000);
  });
});

// Helper ERC20 token for testing (deployable in tests)
contract TestERC20 {
    string public name = "Test";
    string public symbol = "TST";
    uint8 public decimals = 18;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    
    function mint(address to, uint amount) external {
        balanceOf[to] += amount;
    }
    
    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount);
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}