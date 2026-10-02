import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m4ab33664", function () {
  it("should kill mutant by passing non-empty _tos array (mutant requires _tos.length < 0, which always fails)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare valid inputs: at least one recipient and corresponding value
    const recipients = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [1]; // 1 token (wei equivalent after mul_uint256 with 1e18)

    // Original contract would succeed; mutant reverts because _tos.length < 0 is impossible
    await expect(
      instance.connect(owner).transfer(recipients, values)
    ).to.be.reverted;
  });
});