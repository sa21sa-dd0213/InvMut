import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should detect mutant m6bb5652f: receive with - instead of +", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit: should succeed (depositsCount goes from 0 to 1)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    expect(await instance.depositsCount()).to.equal(1);

    // Second deposit: in the original, depositsCount becomes 2; in the mutant, this should revert
    // because require(((depositsCount - 1) >= depositsCount)) becomes require((1 - 1) >= 1) = require(0 >= 1) which is false
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;

    // Verify depositsCount is still 1 (mutant killed: second deposit failed)
    expect(await instance.depositsCount()).to.equal(1);
  });
});