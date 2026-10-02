import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m333a4af1 - sendMoney modifier removal", function () {
  it("should revert when non-owner calls sendMoney on original, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it has balance to send
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Try calling sendMoney from a non-owner address (addr1)
    // On the original contract this should revert (onlyOwner modifier)
    // On the mutant it will succeed, which is the bug
    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});