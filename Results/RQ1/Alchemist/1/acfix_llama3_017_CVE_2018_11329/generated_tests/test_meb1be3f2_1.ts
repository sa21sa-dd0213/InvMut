import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant meb1be3f2 test", function () {
  it("should fail when original CEO address tries to call DrugDealer because mutant sets ceoAddress to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original CEO address that should work on the original contract
    const originalCeoAddress = "0x85abE8E3bed0d4891ba201Af1e212FE50bb65a26";
    
    // Impersonate the original CEO address
    await ethers.provider.send("hardhat_impersonateAccount", [originalCeoAddress]);
    const ceoSigner = await ethers.getSigner(originalCeoAddress);
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: originalCeoAddress,
      value: ethers.parseEther("1.0")
    });

    // Attempt to call DrugDealer() from the original CEO address
    // In the mutant, ceoAddress is address(0), so this should revert
    await expect(
      instance.connect(ceoSigner).DrugDealer()
    ).to.be.revertedWith("Only CEO can set new address");
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [originalCeoAddress]);
  });
});