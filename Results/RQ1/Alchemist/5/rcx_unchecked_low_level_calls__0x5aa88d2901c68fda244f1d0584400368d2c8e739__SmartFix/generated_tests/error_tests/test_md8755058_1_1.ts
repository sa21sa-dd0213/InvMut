import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant md8755058 by sending value when contract balance is zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure contract balance is zero
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(0n);

    // Send 1 wei to multiplicate function with any address
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("0.001") });

    // Original: require((balance + msg.value) >= balance) passes (0.001 >= 0)
    // Mutant: require((balance + msg.value) <= balance) fails (0.001 <= 0 is false)
    await expect(tx).to.be.reverted;
  });
});