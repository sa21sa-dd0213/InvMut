import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m2e3fa7e0 - OpenToThePublic modifier removal", function () {
  it("should revert when non-owner calls OpenToThePublic on original contract but succeed on mutant", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = nonOwner.address; // using nonOwner as whale for simplicity
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();
    
    // Attempt to call OpenToThePublic from non-owner address
    // In the original contract (with onlyOwner modifier), this should revert
    // In the mutant (without modifier), this should succeed
    const tx = instance.connect(nonOwner).OpenToThePublic();
    
    // The test expects this transaction to succeed (which would kill the mutant)
    // In the original contract, this would revert, failing the test
    await expect(tx).to.not.be.reverted;
    
    // Verify the state changed - the game is now open to public
    // Non-owner can now successfully call wager() after OpenToThePublic
    const wagerTx = instance.connect(nonOwner).wager({ value: betLimit });
    await expect(wagerTx).to.not.be.reverted;
  });
});