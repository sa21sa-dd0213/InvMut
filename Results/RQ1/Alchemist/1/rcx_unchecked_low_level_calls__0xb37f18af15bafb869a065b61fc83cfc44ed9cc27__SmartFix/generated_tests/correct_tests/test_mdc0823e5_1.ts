import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant mdc0823e5 test", function () {
  it("should kill the mutant by calling withdrawAll() from owner address expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawAll() can succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call withdrawAll() from owner - should succeed on original, revert on mutant
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});