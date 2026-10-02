import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant ma17c396b by calling transfer with a non-empty array and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: a non-empty array of recipients and corresponding values
    const recipients = [addr1.address];
    const values = [100];

    // This call should succeed on the original contract (require(_tos.length > 0))
    // but will revert on the mutant (require(_tos.length < 0) is always false)
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, values)
    ).to.not.be.reverted;
  });
});