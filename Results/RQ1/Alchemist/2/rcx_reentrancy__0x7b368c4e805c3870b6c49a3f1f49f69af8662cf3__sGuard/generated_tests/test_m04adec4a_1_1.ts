import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m04adec4a detection test", function () {
  it("should detect the mutant by checking logged value matches msg.value (not msg.value-1)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Send exactly 1 wei to Put function via fallback
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.000000000000000001") // 1 wei
    });
    await tx.wait();
    
    // Check the logged value in the Log contract's history
    const historyEntry = await logInstance.History(0);
    // In original: logged value should be 1 wei
    // In mutant: logged value would be 0 (msg.value - 1)
    expect(historyEntry.Val).to.equal(ethers.parseEther("0.000000000000000001"));
  });
});