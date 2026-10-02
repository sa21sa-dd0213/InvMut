import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant ma4973289 detection", function () {
  it("should detect the off-by-one error in Command when contract balance equals msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with exactly 1 ether
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Verify initial balance
    expect(await ethers.provider.getBalance(instanceAddress)).to.equal(ethers.parseEther("1.0"));

    // Call Command with exactly 1 ether and empty data
    // Original would succeed (sending 1 ETH), mutant fails (trying to send 1 ETH + 1 wei)
    const data = "0x";
    const tx = await instance.connect(owner).Command(addr1.address, data, {
      value: ethers.parseEther("1.0")
    });

    await expect(tx).to.be.reverted;
  });
});