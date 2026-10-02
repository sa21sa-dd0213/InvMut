import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection test", function () {
  it("should revert when transferring 0 tokens (kill mutant m8617b2f9)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with required constructor arguments
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000001", // router address
      "0x0000000000000000000000000000000000000002"  // USD token address
    );
    await instance.waitForDeployment();

    // Attempt to transfer 0 tokens from owner to addr1
    // The contract's _transfer function checks require(tAmount > 0, "Transfer amount must be greater than zero")
    await expect(
      instance.transfer(addr1.address, 0)
    ).to.be.revertedWith("Transfer amount must be greater than zero");
  });
});