import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant mb9d88cfa - decimals function", function () {
  it("should return 18 for decimals() in the original contract, but the mutant returns 0", async function () {
    const [owner] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ANCHToken");

    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002"
    );

    await instance.waitForDeployment();

    const decimals = await instance.decimals();

    expect(decimals).to.equal(18);
  });
});