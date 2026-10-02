import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m0c00858a test", function () {
  it("should detect mutant where >= was replaced with == in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialBalance = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });

    // Get contract balance before call
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Call multiplicate with a non-zero value that is >= contract balance
    const sendValue = ethers.parseEther("2.0");
    
    // In the original contract this would succeed (require always true)
    // In the mutant this will revert because (balance + msg.value) != balance when msg.value > 0
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: sendValue })
    ).to.be.reverted;
  });
});