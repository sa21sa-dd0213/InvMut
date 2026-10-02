import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m1fbacb16", function () {
  it("should revert when non-owner calls sendMoney (mutant removed onlyOwner modifier)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so sendMoney can send value
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Attempt to call sendMoney from a non-owner address
    await expect(
      instance.connect(attacker).sendMoney(
        attacker.address,
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});