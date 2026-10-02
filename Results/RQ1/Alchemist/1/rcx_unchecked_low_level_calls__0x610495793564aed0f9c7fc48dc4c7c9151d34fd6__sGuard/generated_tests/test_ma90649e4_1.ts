import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - ma90649e4", function () {
  it("should revert when sendMoney is called by non-owner (kills mutant that removed onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sendMoney from a non-owner address
    const tx = instance.connect(addr1).sendMoney(
      addr1.address,
      ethers.parseEther("0"),
      "0x"
    );

    // Original contract reverts due to onlyOwner modifier
    // Mutant would execute successfully (no revert)
    await expect(tx).to.be.reverted;
  });
});