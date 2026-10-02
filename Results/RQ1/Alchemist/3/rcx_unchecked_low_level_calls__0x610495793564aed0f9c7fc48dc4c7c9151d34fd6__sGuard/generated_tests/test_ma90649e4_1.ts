import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - ma90649e4", function () {
  it("should revert when non-owner calls sendMoney", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sendMoney from non-owner address (addr1)
    // The original contract would revert because of onlyOwner modifier
    // The mutant would allow the call to succeed without revert
    await expect(
      instance.connect(addr1).sendMoney(
        addr1.address,
        ethers.parseEther("0"),
        "0x"
      )
    ).to.be.reverted;
  });
});