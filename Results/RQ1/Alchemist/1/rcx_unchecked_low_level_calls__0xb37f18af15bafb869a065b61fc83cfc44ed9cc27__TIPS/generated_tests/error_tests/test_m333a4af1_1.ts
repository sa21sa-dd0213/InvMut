import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m333a4af1 by calling sendMoney from unauthorized address and expecting revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so sendMoney can be attempted
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call sendMoney from unauthorized address (addr1)
    // The original contract would revert due to onlyOwner modifier
    // The mutant would allow the call to succeed (no modifier)
    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});