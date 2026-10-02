import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner calls a protected function (mutant incorrectly blocks owner)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Transfer ownership from address(0) to addr1 using hardhat_impersonateAccount
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x0000000000000000000000000000000000000000",
    ]);
    const zeroSigner = await ethers.getSigner("0x0000000000000000000000000000000000000000");
    await instance.connect(zeroSigner).transferOwnership(addr1.address);

    // Now addr1 is the owner. Calling transferOwnership from addr1 should revert on the mutant
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;

    // Stop impersonating address(0)
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [
      "0x0000000000000000000000000000000000000000",
    ]);
  });
});