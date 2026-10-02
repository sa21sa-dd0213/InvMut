import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m66eeecdd", function () {
  it("should revert when non-owner calls withdrawAll on original contract, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Verify contract has balance
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(ethers.parseEther("1.0"));

    // Non-owner attempts to withdrawAll - on original contract this reverts
    // On mutant (without onlyOwner modifier), this will succeed and drain funds
    const tx = instance.connect(addr1).withdrawAll();
    await expect(tx).to.be.reverted;
  });
});