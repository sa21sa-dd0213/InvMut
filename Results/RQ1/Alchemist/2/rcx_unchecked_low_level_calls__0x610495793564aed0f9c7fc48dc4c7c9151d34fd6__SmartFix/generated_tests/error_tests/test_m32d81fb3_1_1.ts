import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m32d81fb3 test", function () {
  it("should revert when non-owner calls sendMoney due to onlyOwner modifier", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so there is balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call sendMoney from non-owner address
    await expect(
      instance.connect(nonOwner).sendMoney(
        nonOwner.address,
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.revertedWith(""); // The original contract reverts due to onlyOwner modifier
  });
});