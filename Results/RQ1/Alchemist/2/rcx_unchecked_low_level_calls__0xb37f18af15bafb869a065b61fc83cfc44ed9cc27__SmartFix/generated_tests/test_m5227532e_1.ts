import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m5227532e by calling sendMoney from non-owner address and expecting revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner (addr1) attempts to call sendMoney - should revert in original due to onlyOwner modifier
    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});