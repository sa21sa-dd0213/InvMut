import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - sendMoney modifier removed", function () {
  it("should revert when non-owner calls sendMoney on original, but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = addr2.address;
    const value = ethers.parseEther("0.1");
    const emptyData = "0x";

    // Attempt to call sendMoney from non-owner address (addr1)
    // On the original contract this should revert due to onlyOwner modifier
    // On the mutant it will succeed, thus killing the mutant
    await expect(
      instance.connect(addr1).sendMoney(targetAddress, value, emptyData)
    ).to.be.revertedWith(""); // Empty string matches any revert reason
  });
});