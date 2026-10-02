import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m0f4ea6e3 test", function () {
  it("should revert on first deposit when using mutated <= operator", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send ether to trigger receive() - should revert on mutant
    // because (depositsCount + 1) <= depositsCount is false when depositsCount = 0
    const tx = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    await expect(tx).to.be.reverted;
  });
});