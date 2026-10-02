import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m96b1dac9 test", function () {
  it("should revert when non-owner calls withdraw after removing onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount,
    });

    // Non-owner tries to withdraw all balance - should revert on original, succeed on mutant
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    await expect(
      instance.connect(addr1).withdraw(contractBalance)
    ).to.be.reverted;
  });
});