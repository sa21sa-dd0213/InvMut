import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mafd2c245: onlyOwner modifier with != instead of ==", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, only the owner can call withdrawAll().
    // In the mutant, require(msg.sender != owner) means only non-owners can call it.
    // Therefore, calling withdrawAll() from the owner should succeed in the original,
    // but revert in the mutant. We expect success from the owner to kill the mutant.
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});