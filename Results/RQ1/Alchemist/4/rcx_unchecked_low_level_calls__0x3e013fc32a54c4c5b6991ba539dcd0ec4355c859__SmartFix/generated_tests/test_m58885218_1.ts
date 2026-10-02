import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m58885218: Owner calling withdraw should succeed on original, but fail on mutant (where require(msg.sender != Owner) reverts for Owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract so withdraw has balance to transfer
    const sendTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await sendTx.wait();

    // Owner calls withdraw - should succeed on original, revert on mutant
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    const withdrawTx = await instance.connect(owner).withdraw();
    const receipt = await withdrawTx.wait();

    // Verify the withdrawal occurred on original (mutant would revert before transfer)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(0);

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
  });
});