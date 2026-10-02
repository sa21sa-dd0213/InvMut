import { expect } from "chai";
import { ethers } } from "hardhat";

describe("B mutant m8d6bd7d3", function () {
  it("should detect mutant that sends ETH to address(this) instead of external address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some ETH first via fallback
    const fundTx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Check initial contract balance
    const initialBalance = await ethers.provider.getBalance(contractAddress);
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));

    // Call go() with 0.5 ETH from addr1
    const goTx = await instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
    await goTx.wait();

    // After go(), in the original contract, all ETH (initial 1.0 + 0.5 sent) would be forwarded to the external address
    // In the mutant, the ETH is sent to address(this) so the contract retains the balance
    const finalBalance = await ethers.provider.getBalance(contractAddress);
    
    // In the original, finalBalance should be 0 because all ETH was transferred to owner
    // In the mutant, finalBalance will be > 0 because ETH was sent to itself (address(this))
    expect(finalBalance).to.equal(0);
  });
});