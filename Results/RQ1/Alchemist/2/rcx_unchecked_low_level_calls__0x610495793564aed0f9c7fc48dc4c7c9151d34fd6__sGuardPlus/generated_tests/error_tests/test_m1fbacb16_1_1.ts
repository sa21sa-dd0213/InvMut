import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendMoney (mutant removed onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sendMoney from a non-owner address
    // This should revert in the original (with onlyOwner) but succeed in the mutant
    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0"), "0x")
    ).to.be.reverted;
  });
});