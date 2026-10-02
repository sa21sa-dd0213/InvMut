import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant m31dec8ae", function () {
  it("should emit Supplied event when supplyTokenTo is called; mutant removes this event", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy a mock SavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Mint tokens to addr1 and approve
    await mockToken.mint(addr1.address, ethers.parseEther("1000"));
    await mockToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Set up mock to return credits
    await mockSavings.setDepositSavingsReturn(ethers.parseEther("100"));

    // Call supplyTokenTo and check for Supplied event
    const tx = await instance.connect(addr1).supplyTokenTo(ethers.parseEther("100"), addr2.address);
    const receipt = await tx.wait();

    // Expect the Supplied event to be emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Supplied")
      .withArgs(addr1.address, addr2.address, ethers.parseEther("100"));
  });
});