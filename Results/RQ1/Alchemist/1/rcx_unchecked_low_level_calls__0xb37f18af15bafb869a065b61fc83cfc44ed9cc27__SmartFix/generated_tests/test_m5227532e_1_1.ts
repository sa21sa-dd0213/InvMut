import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendMoney (mutant removed onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner should not be able to call sendMoney (mutant allows it)
    await expect(
      instance.connect(addr1).sendMoney(addr1.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});