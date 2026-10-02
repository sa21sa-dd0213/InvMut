import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m63040b12 test", function () {
  it("should revert with empty _tos array on original but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the from address from the contract
    const fromAddress = await instance.from();
    
    // Ensure msg.sender matches the required address (from address)
    const fromSigner = await ethers.getSigner(fromAddress);
    
    // Attempt to call transfer with empty arrays - should revert on original
    // but on the mutant (which removes the require) it will return true
    const tx = instance.connect(fromSigner).transfer([], []);
    
    // The test expects a revert because the original contract requires _tos.length > 0
    // If the mutant is present, this will not revert and the test will fail, killing the mutant
    await expect(tx).to.be.reverted;
  });
});