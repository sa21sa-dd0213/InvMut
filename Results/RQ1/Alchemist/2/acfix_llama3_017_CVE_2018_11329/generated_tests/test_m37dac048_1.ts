import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m37dac048 - DrugDealer require removal", function () {
  it("should revert when non-CEO calls DrugDealer (original behavior), but mutant allows it", async function () {
    const [owner, nonCeo] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Record the original CEO address
    const originalCeo = await instance.ceoAddress();

    // Attempt to call DrugDealer from a non-CEO address
    // In the original contract this should revert; in the mutant it will succeed
    // We test that the mutant is killed by expecting the call to succeed and change the CEO
    await expect(
      instance.connect(nonCeo).DrugDealer()
    ).to.not.be.reverted;

    // After the call, the CEO should be changed to the caller (nonCeo)
    const newCeo = await instance.ceoAddress();
    expect(newCeo).to.equal(nonCeo.address);
    // Also confirm it's different from the original CEO
    expect(newCeo).to.not.equal(originalCeo);
  });
});