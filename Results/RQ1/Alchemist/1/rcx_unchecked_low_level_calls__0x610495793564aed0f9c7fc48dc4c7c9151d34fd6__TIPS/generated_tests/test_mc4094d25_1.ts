import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - sendMoney modifier removal", function () {
  it("should revert when non-owner calls sendMoney on the original contract", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so sendMoney can transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Attempt to call sendMoney from a non-owner address (addr1)
    const targetAddress = addr2.address;
    const value = ethers.parseEther("0.5");
    const emptyData = "0x";

    // On the original contract this should revert due to onlyOwner modifier
    // On the mutant it would succeed, thus the test will fail on the mutant
    await expect(
      instance.connect(addr1).sendMoney(targetAddress, value, emptyData)
    ).to.be.reverted;
  });
});