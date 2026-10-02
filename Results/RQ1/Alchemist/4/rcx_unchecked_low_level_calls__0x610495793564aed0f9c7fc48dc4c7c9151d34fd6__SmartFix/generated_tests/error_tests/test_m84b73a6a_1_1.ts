import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert on receive when depositsCount is a normal positive integer (kills mutant that changes >= to ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit - depositsCount becomes 1
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Second deposit should revert on mutant because (depositsCount + 1) == depositsCount is false
    // On original it succeeds because (depositsCount + 1) >= depositsCount is always true
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;
  });
});