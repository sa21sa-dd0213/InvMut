import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendMoney (kills mutant mc4094d25)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ETH first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call sendMoney from a non-owner address
    const target = addr2.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";

    // In the original contract, this should revert due to onlyOwner modifier
    // In the mutant (no modifier), it would succeed - killing the mutant
    await expect(
      instance.connect(addr1).sendMoney(target, value, data)
    ).to.be.revertedWith(""); // Empty string because original uses require(msg.sender == owner) without custom message
  });
});