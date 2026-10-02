import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - me0c67ac8", function () {
  it("should return true when transfer succeeds, but mutant returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token contract to use as the target
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the demo contract (no constructor args needed)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();
    
    // Setup: approve demo contract to transfer tokens from owner
    const amount = ethers.parseEther("10");
    await token.approve(await demo.getAddress(), amount * 2n);
    
    // Call transfer with valid parameters
    const recipients = [addr1.address, addr2.address];
    const tx = await demo.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      amount
    );
    const receipt = await tx.wait();
    
    // The original returns true, mutant returns false (default bool)
    expect(receipt.status).to.equal(1); // transaction succeeded
    
    // This assertion will catch the mutant
    const result = await demo.transfer.staticCall(
      owner.address,
      await token.getAddress(),
      recipients,
      amount
    );
    expect(result).to.equal(true);
  });
});

// Helper contract for testing - SimpleERC20 with transferFrom
// This would be deployed as a separate contract in the test environment
// For completeness, include the interface
interface SimpleERC20 {
  transferFrom(from: string, to: string, amount: bigint): Promise<boolean>;
  approve(spender: string, amount: bigint): Promise<boolean>;
}