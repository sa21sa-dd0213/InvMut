import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airDrop mutant detection test", function () {
  it("should detect mutant where loop condition is changed from < to >", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare test data: create a simple ERC20 mock to test transferFrom
    // Deploy a minimal ERC20 token contract for testing
    const TokenFactory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint some tokens to addr1 and approve the airDrop contract to transfer
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);
    await token.connect(addr1).approve(instance.target, mintAmount);
    
    // Create recipients array with one address
    const recipients = [addr2.address];
    const transferValue = ethers.parseEther("10");
    const decimals = 18;
    
    // Get balance of addr2 before the transfer
    const balanceBefore = await token.balanceOf(addr2.address);
    
    // Call transfer function on the airDrop contract
    // In the original contract, this should execute the loop and transfer tokens
    // In the mutant, the loop condition i > _tos.length will be false (0 > 1 is false)
    // so the loop never executes and no transfer happens
    const tx = await instance.connect(addr1).transfer(
      addr1.address,
      token.target,
      recipients,
      transferValue,
      decimals
    );
    await tx.wait();
    
    // Check if the transfer actually happened
    // If the mutant is present, the balance should remain unchanged
    // If original, the balance should increase by 10 tokens
    const balanceAfter = await token.balanceOf(addr2.address);
    
    // The test expects a transfer to occur, so the mutant will fail this assertion
    expect(balanceAfter).to.equal(balanceBefore + transferValue);
  });
});