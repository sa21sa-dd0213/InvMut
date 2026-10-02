import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant m32d81fb3 test", function () {
  it("should revert when non-owner calls sendMoney (mutant removed onlyOwner modifier)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so sendMoney can transfer value
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call sendMoney from an unauthorized address (attacker)
    // The original contract would revert due to onlyOwner modifier
    // The mutant should NOT revert, making this test fail (detecting the mutant)
    await expect(
      instance.connect(attacker).sendMoney(
        attacker.address,
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});