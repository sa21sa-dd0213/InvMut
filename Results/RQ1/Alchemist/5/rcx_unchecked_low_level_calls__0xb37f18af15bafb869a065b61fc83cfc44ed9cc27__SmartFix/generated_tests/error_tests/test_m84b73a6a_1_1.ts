import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m84b73a6a - receive function", function () {
  it("should revert when sending Ether to the contract due to mutated require condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require((depositsCount + 1) >= depositsCount) to require((depositsCount + 1) == depositsCount)
    // Since depositsCount + 1 can never equal depositsCount, any ETH sent to the contract should revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;

    // Verify depositsCount remained 0 since the receive function never succeeded
    expect(await instance.depositsCount()).to.equal(0);
  });

  it("should succeed when sending Ether to the contract in the original implementation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // This test confirms the expected behavior of the original contract
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.not.be.reverted;

    expect(await instance.depositsCount()).to.equal(1);
  });
});