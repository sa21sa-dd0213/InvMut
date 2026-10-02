import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 test", function () {
  it("should kill mutant by sending exactly 10 ether and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should succeed on original, fail on mutant (mutant requires != 10 ether)
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Verify transaction succeeded (original behavior)
    expect(receipt.status).to.equal(1);
    
    // Also verify pastBlockTime was updated (confirms the require passed)
    const pastBlockTime = await instance.pastBlockTime();
    expect(pastBlockTime).to.be.gt(0);
  });
});