import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m9aed845c", function () {
  it("should revert when sendMoney is called with value exceeding contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Try to send more than the contract balance to addr1
    const excessAmount = ethers.parseEther("2.0");
    
    // This should revert because contract only has 1 ETH, trying to send 2 ETH
    await expect(
      instance.connect(owner).sendMoney(addr1.address, excessAmount)
    ).to.be.reverted;
  });
});