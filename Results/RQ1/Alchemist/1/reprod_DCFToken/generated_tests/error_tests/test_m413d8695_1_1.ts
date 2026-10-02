import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when setCaller is called with zero address - mutant removes require(_cfo != address(0))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const liquidityReceiveAddress = addr1.address;

    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Attempt to set CFO to zero address - should revert in original, pass in mutant
    const tx = instance.connect(owner).setCaller(ethers.ZeroAddress);

    // The original contract has require(_cfo != address(0)) which should revert
    // The mutant removes this check, so this would succeed in the mutant
    await expect(tx).to.be.reverted;
  });
});