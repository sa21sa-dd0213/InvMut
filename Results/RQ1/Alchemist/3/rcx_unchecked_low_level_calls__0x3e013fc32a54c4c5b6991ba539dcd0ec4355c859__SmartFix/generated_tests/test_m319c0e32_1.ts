import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m319c0e32 by triggering revert when sending balance + msg.value + 1", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Verify initial balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundAmount);

    // Call multiplicate with msg.value equal to current contract balance
    // This should work in original but fail in mutant (attempts to send balance + msg.value + 1)
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // The mutant will try to send balanceBefore + balanceBefore + 1 = 2 * balanceBefore + 1
    // But contract only has balanceBefore + balanceBefore = 2 * balanceBefore after receiving msg.value
    // So it will revert with insufficient balance
    await expect(
      instance.connect(owner).multiplicate(addr2.address, { value: balanceBefore })
    ).to.be.reverted;
  });
});