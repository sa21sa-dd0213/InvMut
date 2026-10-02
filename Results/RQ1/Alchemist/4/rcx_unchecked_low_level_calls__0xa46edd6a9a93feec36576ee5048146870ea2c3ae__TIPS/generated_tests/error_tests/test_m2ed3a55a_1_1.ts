import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m2ed3a55a by providing exactly one recipient", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an array with exactly one recipient
    const recipients = [addr2.address];
    const amounts = [ethers.parseEther("1")];

    // The original contract would succeed (length > 0), 
    // the mutant will revert because length < 0 is impossible
    await expect(
      instance.transfer(owner.address, addr1.address, recipients, amounts)
    ).to.be.reverted;
  });
});