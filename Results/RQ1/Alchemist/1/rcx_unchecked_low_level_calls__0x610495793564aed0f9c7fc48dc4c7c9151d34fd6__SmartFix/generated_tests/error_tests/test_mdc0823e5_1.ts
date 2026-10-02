import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call withdrawAll and succeed, but mutant will revert for owner", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawAll has balance to send
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to call withdrawAll successfully
    // In the mutant, owner will be reverted because require(msg.sender != owner) blocks the owner
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;
  });
});