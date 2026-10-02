import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mfdf4ca44 test", function () {
  it("should revert when creator calls migrateTo due to mutant changing == to !=", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, only the creator can call migrateTo.
    // The mutant changes the require condition to creator != msg.sender,
    // so when the creator calls it, it should revert.
    await expect(
      instance.connect(owner).migrateTo(addr2.address)
    ).to.be.reverted;
  });
});