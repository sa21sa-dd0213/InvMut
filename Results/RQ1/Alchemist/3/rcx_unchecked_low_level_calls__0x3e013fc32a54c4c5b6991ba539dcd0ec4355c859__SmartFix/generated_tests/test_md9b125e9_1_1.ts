import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should revert when calling multiplicate with msg.value less than contract balance (detects mutant md9b125e9)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with 2 ETH
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("2.0")
    });

    // Verify initial balance
    expect(await ethers.provider.getBalance(contractAddress)).to.equal(ethers.parseEther("2.0"));

    // Attempt to call multiplicate with only 1 ETH (less than contract balance of 2 ETH)
    // Original would revert because msg.value (1) < address(this).balance (2)
    // Mutant would succeed because condition is always true
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, {
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;
  });
});