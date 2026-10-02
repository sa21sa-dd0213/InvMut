import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m68f98b4c by calling transfer with v[i]=1 and expecting success on original but revert on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const values = [1];

    // In the original contract, v[i]=1 passes the require check because (1 * 1e18) / 1 == 1e18
    // In the mutant, v[i]=1 fails because (1 ** 1e18) / 1 == 1, which != 1e18
    // The call should revert on the mutant, so we expect revert here
    await expect(
      instance.transfer(tos, values)
    ).to.be.reverted;
  });
});