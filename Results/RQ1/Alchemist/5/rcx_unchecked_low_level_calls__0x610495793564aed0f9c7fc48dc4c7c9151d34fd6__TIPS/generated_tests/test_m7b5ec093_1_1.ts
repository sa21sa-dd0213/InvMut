import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m7b5ec093", function () {
    it("should revert when sendMoney call fails, but mutant incorrectly succeeds", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy SimpleWallet
        const Factory = await ethers.getContractFactory("SimpleWallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Deploy a simple contract that rejects ETH
        const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
        const rejector = await RejectorFactory.deploy();
        await rejector.waitForDeployment();
        
        // Send some ETH to the wallet first so it has balance to send
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });
        
        // Attempt to send ETH to the rejector - original should revert, mutant should not
        const tx = instance.connect(owner).sendMoney(
            await rejector.getAddress(),
            ethers.parseEther("0.5"),
            "0x"
        );
        
        await expect(tx).to.be.reverted;
    });
});